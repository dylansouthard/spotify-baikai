# Playback verification and fallback

`PUT /player/play-tracks` still sends the original, valid raw-track request first:

```http
PUT https://api.spotify.com/v1/me/player/play?device_id=optional-device
Content-Type: application/json
Authorization: Bearer <redacted>

{"uris":["spotify:track:71kapcyWLxdv7kQpM6jFTv"]}
```

The device query is omitted when no device is supplied. The controller forwards a JSON array, with no offset, pause, transfer, retries of playback writes, or extra playback commands around it. All dependent calls are awaited. This matches [Spotify's playback contract](https://developer.spotify.com/documentation/web-api/reference/start-a-users-playback).

The user's live tests isolated a client-dependent failure: the same raw request succeeds on Web Player, while the native/mobile client sometimes stops without starting the requested track despite returning 204. A 204 is therefore treated as command acceptance, followed by verification for raw-track requests.

## Behavior

1. Identify the Spotify account (`GET /me`) and acquire an account lock.
2. Send the original raw playback request once.
3. On 204, poll [`GET /me/player`](https://developer.spotify.com/documentation/web-api/reference/get-information-about-the-users-current-playback) at most three times: immediately, then after 300 ms and another 600 ms. Require a player/device, `is_playing: true`, and a requested track URI or ID. Track relinking via `linked_from` is supported. Any requested track satisfies multi-track verification, including when shuffle affects the first item.
4. If these reads succeed but never confirm playback, find/reuse a private buffer playlist, replace its contents with the requested tracks in order, play its context, and repeat the same bounded verification. Fallback verification additionally requires the buffer's context URI.
5. Return success only after direct or fallback verification. An unverified fallback returns 502 with `PLAYBACK_NOT_VERIFIED`.

Spotify read errors (including missing scopes, rate limits and transport failures) are not evidence of silent playback. They return structured errors without triggering fallback. Initial playback API errors likewise do not trigger fallback. A failing fallback is not retried recursively.

HTTP calls have a 2.5-second timeout; a shared 20-second cancellation deadline covers all Spotify calls and poll delays in an attempt. There is no synchronous sleep or unbounded polling. Normal direct success needs only one player-state read. Verification observes Spotify's reported state; it cannot measure audible sound or guarantee that the whole remaining queue will play.

## Response compatibility

Successful requests retain **204 with no body by default**, whether verified raw playback or verified fallback succeeded. Add `?details=true` to receive **200 with JSON** instead:

```json
{
  "ok": true,
  "outcome": "fallback_verified",
  "requested_mode": "uris",
  "effective_mode": "playlist_context_fallback",
  "spotify_status": 204,
  "raw_spotify_status": 204,
  "fallback_used": true,
  "fallback_reason": "RAW_PLAYBACK_NOT_VERIFIED",
  "playlist_id": "...",
  "verification": {
    "verified": true,
    "attempts": 1,
    "is_playing": true,
    "current_uri": "spotify:track:71kapcyWLxdv7kQpM6jFTv",
    "device_id": "...",
    "device_matches": true
  }
}
```

The example omits additional verification fields. Outcomes are `raw_verified`, `fallback_verified`, `api_error`, or `fallback_failed`. Error responses retain `error`, `type`, and `message` and add `reason`, `stage`, Spotify status/body, and available diagnostics. `fallback_used` means fallback was attempted, even when that attempt failed; `effective_mode` is null on failure. `raw_verification` retains the observation that triggered fallback. `spotify_status` represents the relevant Spotify response, while `raw_spotify_status` retains the accepted raw command's 204.

`PUT /player/play-album` keeps its existing context-command behavior and 204 default; it does not gain raw-track fallback. With `details=true`, it returns `outcome: "accepted"`, `effective_mode: "context_uri"`, and `verification: null` to avoid claiming verified playback.

The updated OpenAPI schema declares the new responses and query parameters. Parameters are inline because the GPT importer rejected parameter `$ref` entries. Deploy the code and schema, then paste the updated `openapi.yaml` into the GPT action configuration. Existing callers can keep their request bodies unchanged.

## Devices and errors

`GET /player/devices` exposes the ID, name, type, active flag, and restricted flag returned by [Spotify's device endpoint](https://developer.spotify.com/documentation/web-api/reference/get-a-users-available-devices). A native client can be absent from this list even while it appears to be playing; this endpoint reports what Spotify exposes, not an independent device scan.

Explicit `device_id` is passed unchanged to both playback writes. The player-state endpoint does not accept a device filter, so verification compares the returned device ID. A matching track on the wrong device does not count as success. Without a device ID, both writes use Spotify's currently active device. The wrapper never chooses a random device or transfers playback.

For `NO_ACTIVE_DEVICE`, playback 404s, or exhausted fallback verification, the wrapper also attempts to include device diagnostics. Failure of that lookup does not replace the original error. Spotify 401/403/404/429/5xx statuses and error reasons/messages are preserved; `Retry-After` is forwarded when supplied.

## Buffer lifecycle and concurrency

The private playlist is named **spotify-baikai playback buffer** with an app-specific description marker. It is owned by the current user. Creation uses [`POST /me/playlists`](https://developer.spotify.com/documentation/web-api/reference/create-playlist), replacement uses [`PUT /playlists/{id}/items`](https://developer.spotify.com/documentation/web-api/reference/reorder-or-replace-playlists-items), and requests above 100 items append subsequent 100-item chunks through [`POST /playlists/{id}/items`](https://developer.spotify.com/documentation/web-api/reference/add-items-to-playlist). Each write completes before the next, and playback starts only after all tracks have been written.

The buffer ID is persisted per account in `.spotify-playback/` in the app directory, outside Git. Set `SPOTIFY_PLAYBACK_STATE_DIR` to a persistent writable directory if the app directory is read-only or replaced during deployment. Only playlist IDs and lock metadata are stored; no OAuth tokens are persisted there. Before reusing a saved playlist the wrapper checks its ownership, privacy and reserved name.

If metadata is missing, the wrapper searches owned private playlists for the exact name and description marker. This makes reuse survive restarts and most interrupted creations. Search is bounded to 20 pages of 50; an incomplete search fails instead of creating duplicates. Renaming the saved buffer or making it public causes a `BUFFER_CHANGED` error rather than silently overwriting it. The buffer is retained for reuse, not deleted immediately after starting playback, because deleting or clearing the active context could affect playback. Its contents are replaced by the next fallback.

Raw and context commands for one account are protected by an atomic filesystem lock, keyed by account ID rather than access token. Concurrent requests receive 409 `PLAYBACK_BUSY` without another playback write. Workers must share the same state directory and filesystem locking semantics. Deployments on separate machines need shared locking/storage before using this design. Playback commands from other apps or manual Spotify interactions remain outside this lock.

The lock is released on normal success and failure. After an abrupt process/server crash a `.lock` directory may remain. It is deliberately not expired automatically while a Spotify mutation might still be outstanding. Stop all app workers, inspect the lock's `owner.json` (PID/time), and remove only the abandoned `.lock` directory before restarting; keep the account's `.json` buffer mapping. Do not delete locks while requests are running.

Spotify does not provide a transaction covering playlist creation and local persistence. A crash or ambiguous network failure during creation may leave an orphan before rediscovery; the wrapper does not blindly retry the creation. The normal path reuses one playlist per account.

Required grants are `user-read-playback-state`, `user-modify-playback-state`, `playlist-read-private`, and `playlist-modify-private`. The existing authorization flow already requests them; the OpenAPI scope list now includes the private playlist read grant too. A token without these grants produces a visible Spotify error.

## Diagnostics and tests

Use `SPOTIFY_PLAYBACK_DEBUG=1` (or `true`) or `NODE_ENV=development`. Request, verification, fallback, and final-outcome log records share a request ID and include playback mode, URI count, supplied device ID, Spotify status, and verification/fallback details. They do not dump the requested URI array, Axios config, or authorization headers. Current-track URI and sanitized Spotify errors are included; reflected bearer tokens and sensitive JSON fields are redacted.

Run `npm test`. The regression suite is in `tests/playback.test.js` (the old singular `test/` directory is ignored by this repository). It exercises real Express and Axios HTTP serialization against local fixtures using fake credentials, including delayed state, silent success, fallback verification failure, device mismatch, buffer reuse, track order/chunking, authorization/rate-limit errors, lock release/concurrency, token redaction, and legacy/default responses. No live Spotify playback is performed by the tests.

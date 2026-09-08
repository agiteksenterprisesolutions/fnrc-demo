<?php
// fnrc/deploy/hostinger/api/token.php
//
// The token endpoint for PHP shared hosting (Hostinger's standard plans run
// Apache + PHP, with no Node process to keep alive). It is a line-for-line
// port of server/token.mjs: same claims, same attribute coercion, same TTL.
//
// A LiveKit token is a plain HS256 JWT, so this needs no library — hash_hmac
// is the whole of it.
//
// Credentials come from fnrc-secrets.php, which lives ONE LEVEL ABOVE
// public_html so it can never be served, even if PHP is misconfigured.

declare(strict_types=1);

const TTL_SECONDS = 600;

function fnrc_config(): array
{
    // Environment first (VPS, or a plan where you can set vars), then the
    // secrets file beside/above the docroot.
    $config = [
        'url' => getenv('LIVEKIT_URL') ?: '',
        'apiKey' => getenv('LIVEKIT_API_KEY') ?: '',
        'apiSecret' => getenv('LIVEKIT_API_SECRET') ?: '',
    ];

    foreach ([__DIR__ . '/../../fnrc-secrets.php', __DIR__ . '/../fnrc-secrets.php'] as $path) {
        if (!is_file($path)) {
            continue;
        }
        $file = require $path;
        if (is_array($file)) {
            foreach (['url', 'apiKey', 'apiSecret'] as $key) {
                if (empty($config[$key]) && !empty($file[$key])) {
                    $config[$key] = (string) $file[$key];
                }
            }
        }
        break;
    }

    return $config;
}

function base64url(string $input): string
{
    return rtrim(strtr(base64_encode($input), '+/', '-_'), '=');
}

function sign(array $claims, string $secret): string
{
    $header = base64url(json_encode(['alg' => 'HS256', 'typ' => 'JWT'], JSON_UNESCAPED_SLASHES));
    // JSON_UNESCAPED_SLASHES keeps the wss:// URL and room ids byte-identical
    // to what the Node implementation produces.
    $payload = base64url(json_encode($claims, JSON_UNESCAPED_SLASHES));
    $signature = base64url(hash_hmac('sha256', "$header.$payload", $secret, true));

    return "$header.$payload.$signature";
}

/** Attributes are a typed map<string,string>, so everything is coerced. */
function normalise_attributes(array $input): array
{
    $language = (string) ($input['language'] ?? 'auto');
    $voice = strtolower((string) ($input['voice_output'] ?? 'on'));
    $silent = ['off', 'false', '0', 'no', 'none', 'text', 'chat', 'mute', 'silent'];

    return [
        'language' => $language,
        // Anything falsy-sounding means silence; everything else means speech.
        'voice_output' => in_array($voice, $silent, true) ? 'off' : 'on',
    ];
}

function fail(int $status, string $message): never
{
    http_response_code($status);
    header('Content-Type: application/json');
    echo json_encode(['error' => $message]);
    exit;
}

header('Content-Type: application/json');

// Same-origin by default: the site and this endpoint are one host, so only an
// explicit CORS_ORIGIN opens it up to another origin.
$corsOrigin = getenv('CORS_ORIGIN') ?: '';
if ($corsOrigin !== '') {
    header("Access-Control-Allow-Origin: $corsOrigin");
    header('Access-Control-Allow-Headers: Content-Type');
    header('Access-Control-Allow-Methods: POST, OPTIONS');
}

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    fail(405, 'Method not allowed');
}

$config = fnrc_config();
if ($config['url'] === '' || $config['apiKey'] === '' || $config['apiSecret'] === '') {
    error_log('FNRC: missing LiveKit credentials — check fnrc-secrets.php above public_html.');
    fail(500, 'Token service not configured');
}

$raw = file_get_contents('php://input') ?: '';
if (strlen($raw) > 16384) {
    fail(400, 'Bad request');
}

$body = $raw === '' ? [] : json_decode($raw, true);
if (!is_array($body)) {
    fail(400, 'Bad request');
}

// TODO: this endpoint mints room access — add your own auth check here.

// random_bytes-backed v4 UUID, so room and identity are unguessable.
function fnrc_uuid(): string
{
    $bytes = random_bytes(16);
    $bytes[6] = chr((ord($bytes[6]) & 0x0f) | 0x40);
    $bytes[8] = chr((ord($bytes[8]) & 0x3f) | 0x80);

    return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($bytes), 4));
}

$identity = (string) ($body['participant_identity'] ?? ('caller-' . fnrc_uuid()));
$room = (string) ($body['room_name'] ?? ('fnrc-' . fnrc_uuid()));
$now = time();
$attributes = is_array($body['participant_attributes'] ?? null) ? $body['participant_attributes'] : [];

$token = sign([
    'iss' => $config['apiKey'],
    'sub' => $identity,
    'jti' => $identity,
    'nbf' => $now,
    'exp' => $now + TTL_SECONDS,
    'name' => (string) ($body['participant_name'] ?? 'Caller'),
    // The whole contract with the agent: two strings.
    'attributes' => (object) normalise_attributes($attributes),
    'video' => (object) [
        'room' => $room,
        'roomJoin' => true,
        'canPublish' => true,
        'canSubscribe' => true,
        'canPublishData' => true,
    ],
], $config['apiSecret']);

http_response_code(201);
echo json_encode(
    ['server_url' => $config['url'], 'participant_token' => $token],
    JSON_UNESCAPED_SLASHES,
);

<?php
// Copy to fnrc-secrets.php and upload it ONE LEVEL ABOVE public_html —
// i.e. /home/uXXXXXXX/domains/fnrc.agiteks.com/fnrc-secrets.php, NOT inside
// public_html. The API secret signs the tokens; anyone who reads it can mint
// room access.

return [
    'url' => 'wss://your-project.livekit.cloud',
    'apiKey' => 'your-api-key',
    'apiSecret' => 'your-api-secret',
];

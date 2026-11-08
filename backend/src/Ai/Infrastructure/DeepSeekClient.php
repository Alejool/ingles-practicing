<?php

namespace Ruta\Ai\Infrastructure;

use Generator;
use GuzzleHttp\ClientInterface;
use GuzzleHttp\Exception\GuzzleException;
use GuzzleHttp\RequestOptions;
use Psr\Http\Message\StreamInterface;
use Ruta\Ai\Domain\ChatModel;
use Ruta\Ai\Domain\ModelResponse;
use Ruta\Ai\Domain\ModelUnreachable;

/**
 * Cliente HTTP de DeepSeek (solo HTTP, sin reglas): POST en streaming con 10 s para
 * conectar y sin tiempo total (una corrección larga tarda minutos). Los trozos se
 * entregan según llegan, sin búfer.
 */
final class DeepSeekClient implements ChatModel
{
    private const CONNECT_TIMEOUT_S = 10;

    private const READ_BYTES = 8192;

    public function __construct(
        private readonly ClientInterface $http,
        private readonly string $url,
        private readonly string $apiKey,
    ) {}

    public function stream(array $request): ModelResponse
    {
        try {
            $response = $this->http->request('POST', $this->url, [
                RequestOptions::HEADERS => ['Content-Type' => 'application/json', 'Authorization' => "Bearer {$this->apiKey}"],
                RequestOptions::BODY => json_encode($request, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR),
                RequestOptions::STREAM => true,
                RequestOptions::CONNECT_TIMEOUT => self::CONNECT_TIMEOUT_S,
                RequestOptions::TIMEOUT => 0,
                RequestOptions::HTTP_ERRORS => false,
            ]);
        } catch (GuzzleException $e) {
            throw new ModelUnreachable($e->getMessage(), 0, $e);
        }

        return new ModelResponse($response->getStatusCode(), self::read($response->getBody()));
    }

    /** @return Generator<int, string> */
    private static function read(StreamInterface $body): Generator
    {
        while (! $body->eof()) {
            $chunk = $body->read(self::READ_BYTES);
            if ($chunk !== '') {
                yield $chunk;
            }
        }
    }
}

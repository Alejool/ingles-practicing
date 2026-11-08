<?php

namespace Ruta\Ai\Domain;

use DomainException;

/** Los datos de una petición de IA no sirven para componer los mensajes (`PayloadError` de prompts.ts). */
final class PayloadError extends DomainException {}

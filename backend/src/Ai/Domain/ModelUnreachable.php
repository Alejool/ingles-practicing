<?php

namespace Ruta\Ai\Domain;

use RuntimeException;

/** No se llegó al proveedor del modelo (red caída, DNS, conexión cortada sin respuesta). */
final class ModelUnreachable extends RuntimeException {}

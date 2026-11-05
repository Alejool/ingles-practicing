<?php

// Ejemplo que modifica una tabla solo-inserción. Solo lo lee AppendOnlyTest; nunca se carga.

namespace Tests\fixtures\architecture;

final class AppendOnlyViolation
{
    public function run(object $db): void
    {
        $db->update('UPDATE learner_events SET kind = ? WHERE id = ?', ['x', 1]);
        $db->delete('delete from learner_events where id = ?', [1]);
        $db->table('learner_events')->where('id', 1)->update(['kind' => 'x']);
        $db->table('learner_events')->delete();
    }
}

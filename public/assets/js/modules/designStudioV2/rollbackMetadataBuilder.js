export function validateRollbackNote(note) {
    return typeof note === 'string' && note.trim().length >= 5 && note.trim().length <= 500;
}

export function buildRollbackMetadata({ currentVersion = null, targetVersion = null, publishedBy = null, rollbackNote = '' } = {}) {
    if (!validateRollbackNote(rollbackNote) || !Number.isInteger(targetVersion)) {
        return null;
    }

    return {
        rollback: true,
        rollbackFrom: currentVersion,
        rollbackTarget: targetVersion,
        rollbackNote: rollbackNote.trim(),
        publishedBy,
    };
}

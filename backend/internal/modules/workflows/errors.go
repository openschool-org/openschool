package workflows

import "errors"

var errClassesInUse = errors.New("attendance or marks are already recorded for these classes, so the placement can no longer be reverted")

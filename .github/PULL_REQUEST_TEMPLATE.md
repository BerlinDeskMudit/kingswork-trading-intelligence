## Summary

<!-- What does this PR do? One to two sentences. -->

## Related Issue

<!-- Link the issue this PR addresses, e.g. "Closes #123" or "Relates to #456" -->

## Type of Change

- [ ] Bug fix (non-breaking change that fixes an issue)
- [ ] New feature (non-breaking change that adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to change)
- [ ] Documentation update
- [ ] Test improvement
- [ ] CI/infrastructure change
- [ ] Refactoring (no functional changes)

## Checklist

- [ ] I have read [`CONTRIBUTING.md`](CONTRIBUTING.md)
- [ ] `python -m pytest` passes (from `backend/`)
- [ ] `npm run typecheck` passes (from `frontend/`)
- [ ] `npm test` passes (from `frontend/`)
- [ ] `npm run build` passes (from `frontend/`)
- [ ] I have added tests that cover my changes (if applicable)
- [ ] I have updated documentation (if applicable)
- [ ] New SQLAlchemy models are reflected in the schema/docs
- [ ] My changes do not commit any secrets, keys, or credentials

## Screenshots / Output

<!-- If this change affects an API response format, the dashboard UI, or CLI
     behavior, paste a before/after snippet or screenshot. -->

## Testing

<!-- How did you verify this change? Include commands and expected output if
     non-obvious. -->

```sh
# e.g., python -m pytest tests/test_risk_manager.py -v
```
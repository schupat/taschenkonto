# Release Skill
1. Run the build command and ensure it passes
2. Grep all template files for inline event handlers (onclick, onsubmit, etc.) — abort if found
3. Update version in package.json (bump patch unless told otherwise)
4. Update RELEASE_NOTES.md with changes since last tag
5. Commit with message "chore: release vX.Y.Z"
6. Create git tag vX.Y.Z
7. Push commit and tags

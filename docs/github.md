# GitHub tools

GitHub integration is implemented in the local runner.

Authentication is read only from the runner process environment:

    export GITHUB_TOKEN=...
    npm start -- --workspace ~/some/project

The token is never included in the Gemini prompt or extension code.

When GITHUB_TOKEN is absent, the runner exposes only filesystem tools.

Implemented tools:

- github_create_repository
- github_get_repository
- github_list_files
- github_read_file
- github_create_file
- github_update_file
- github_delete_file
- github_create_branch
- github_create_pull_request

The GitHub API client uses the REST API and the token is kept in the runner process. Review the token's repository permissions before running an agent task.

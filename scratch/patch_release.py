import yaml

with open('.github/workflows/release.yml', 'r') as f:
    text = f.read()

# Add permissions
text = text.replace("permissions:\n  contents: write", "permissions:\n  contents: write\n  actions: write")

# Add retention-days: 1
text = text.replace("          name: windows-artifacts", "          name: windows-artifacts\n          retention-days: 1")
text = text.replace("          name: mac-artifacts", "          name: mac-artifacts\n          retention-days: 1")

# Add cleanup steps
publish_steps_end = """          generate_release_notes: true
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}"""

cleanup_steps = """          generate_release_notes: true
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      - name: Clear all intermediate build artifacts from Actions storage
        uses: actions/github-script@v7
        with:
          script: |
            const res = await github.rest.actions.listWorkflowRunArtifacts({
              owner: context.repo.owner,
              repo: context.repo.repo,
              run_id: context.runId,
            });
            for (const artifact of res.data.artifacts) {
              await github.rest.actions.deleteArtifact({
                owner: context.repo.owner,
                repo: context.repo.repo,
                artifact_id: artifact.id,
              });
            }

      - name: Clean up old completed workflow runs
        uses: actions/github-script@v7
        with:
          script: |
            const runs = await github.rest.actions.listWorkflowRuns({
              owner: context.repo.owner,
              repo: context.repo.repo,
              workflow_id: 'release.yml',
              status: 'completed',
              per_page: 100
            });
            for (const run of runs.data.workflow_runs) {
              if (run.id !== context.runId) {
                await github.rest.actions.deleteWorkflowRun({
                  owner: context.repo.owner,
                  repo: context.repo.repo,
                  run_id: run.id
                });
              }
            }"""

text = text.replace(publish_steps_end, cleanup_steps)

with open('.github/workflows/release.yml', 'w') as f:
    f.write(text)

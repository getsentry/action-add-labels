import * as github from '@actions/github';
import * as core from '@actions/core';

async function run(): Promise<void> {
  try {
    const githubToken = core.getInput('github_token');

    const labels = core
      .getInput('labels')
      .split('\n')
      .filter(l => l !== '');
    const [owner, repo] = core.getInput('repo').split('/');
    const number =
      core.getInput('number') === ''
        ? github.context.issue.number
        : parseInt(core.getInput('number'));

    if (labels.length === 0) {
      return;
    }

    const octokit = github.getOctokit(githubToken);

    // Verify the issue or pull request exists before attempting to add labels.
    // This prevents errors when the action is triggered by events referencing
    // issues/PRs that have since been deleted or transferred.
    try {
      await octokit.rest.issues.get({
        owner,
        repo,
        issue_number: number
      });
    } catch (e) {
      if (isRequestError(e) && e.status === 404) {
        core.warning(
          `Issue or pull request #${number} not found in ${owner}/${repo}. ` +
            `It may have been deleted or transferred. Skipping label addition.`
        );
        return;
      }
      throw e;
    }

    await octokit.rest.issues.addLabels({
      labels,
      owner,
      repo,
      issue_number: number
    });
  } catch (e) {
    if (e instanceof Error) {
      core.error(e);
      core.setFailed(e.message);
    }
  }
}

function isRequestError(e: unknown): e is Error & {status: number} {
  return e instanceof Error && typeof ((e as unknown) as Record<string, unknown>).status === 'number';
}

run();

const core = require('@actions/core');
const github = require('@actions/github');

async function run() {
  try {

    const request = {
      owner: github.context.repo.owner,
      repo: github.context.repo.repo,
      pull_number: github.context.payload.pull_request.number,
    }

    const title = github.context.payload.pull_request.title || '';
    const labels = github.context.payload.pull_request.labels;

    let newTitle;
    let updateTitle = false;


    if (labels.some(e => e.name === 'review')) {
      newTitle = title.replace('WIP:', '')
      updateTitle = true
    } 

    if (!labels.some(e => e.name === 'review') && !title.includes('WIP')) {
      newTitle = `WIP: ${title}`
      updateTitle = true
    } 

    if (updateTitle) {
      request.title = newTitle;
      core.info(`New title is: ${request.title}`);
    } else {
      core.warning('No need to update PR title');
    }


    if (!updateTitle) {
      return;
    }

    const octokit = github.getOctokit(process.env.GITHUB_TOKEN);
    const response = await octokit.pulls.update(request);

    core.info(`Response: ${response.status}`);
    if (response.status !== 200) {
      core.error('Updating the pull request has failed');
    }
  }
  catch (error) {
    core.error(error);
    core.setFailed(error.message);
  }
}

run()

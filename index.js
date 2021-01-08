const core = require('@actions/core');
const github = require('@actions/github');



const getNewTitle = () => {
  const title = github.context.payload.pull_request.title || '';
  const labels = github.context.payload.pull_request.labels;

  let newTitle = title;

  if (labels.some(e => e.name === 'review')) {
    core.info(`PR contains 'review' label, removing WIP`);
    newTitle = title.replace('WIP:', '')
  } 

  if (!labels.some(e => e.name === 'review') && !title.includes('WIP')) {
    core.info(`PR doesn't contain 'review' label, adding WIP`);
    newTitle = `WIP: ${title}`
  }

  return newTitle
} 

async function run() {
  try {
    const octokit = github.getOctokit(process.env.GITHUB_TOKEN);


    if (github.context.payload.pull_request.mergeable === false) {
      await octokit.issues.createComment({
        owner: github.context.repo.owner,
        repo: github.context.repo.repo,
        issue_number: github.context.payload.pull_request.number,
        body: "You have a merge conflict here",
      })

      core.info("Added a comment")

      const labels = github.context.payload.pull_request.labels;
      
      if (labels.some(e => e.name === 'review')) {
        await octokit.issues.removeLabel({
          owner: github.context.repo.owner,
          repo: github.context.repo.repo,
          issue_number: github.context.payload.pull_request.number,
          name: "review",
        })
      } 
      
      core.info("Removed the label")
    }

    await octokit.pulls.update({
      owner: github.context.repo.owner,
      repo: github.context.repo.repo,
      pull_number: github.context.payload.pull_request.number,
      title:  getNewTitle(),
    });


  }
  catch (error) {
    core.error(error);
    core.setFailed(error.message);
  }
}

run()

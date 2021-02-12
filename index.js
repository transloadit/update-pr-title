const core = require('@actions/core');
const github = require('@actions/github');
const { IncomingWebhook } = require('@slack/webhook');

const url = process.env.SLACK_WEBHOOK_URL;

const updateTitle = async (context, octokit) => {
  const title = context.payload.pull_request.title || '';
  const labels = context.payload.pull_request.labels;

  let newTitle = title;

  if (labels.some(e => e.name === 'review')) {
    core.info(`PR contains 'review' label, removing WIP`);
    newTitle = title.replace('WIP:', '').trim()
  } 

  if (!labels.some(e => e.name === 'review') && !title.includes('WIP')) {
    core.info(`PR doesn't contain 'review' label, adding WIP`);
    newTitle = `WIP: ${title}`
  }

  await octokit.pulls.update({
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
    pull_number: github.context.payload.pull_request.number,
    title:  newTitle,
  });
} 


const notifyReview = async (context) => {
  const webhook = new IncomingWebhook(url);
  const labels = context.payload.pull_request.labels;

  const reviewMessageBody = {
    "username": "Github Actions",
    "text": `Pull request by ${context.payload.pull_request.user.login} ready for review: <${context.payload.pull_request.html_url}|${context.payload.pull_request.title}>`,
    "icon_emoji": ":octocat:"
  };

  if (labels.some(e => e.name === 'review')) {
    core.info(`PR is ready for review, sending slack notification.`);
    await webhook.send(reviewMessageBody);  
  } 
} 

async function run() {
  try {
    const octokit = github.getOctokit(process.env.GITHUB_TOKEN);

    if (!github.context.payload.pull_request) {
      core.info("No PR payload, this is master branch, skipping.")
      return;
    }

    if (github.context.payload.merged_at) {
      core.info("PR already merged, skipping.")
      return;
    }

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

    // await notifyReview(github.context)

    await updateTitle(github.context, octokit)

  }
  catch (error) {
    core.error(error);
    core.setFailed(error.message);
  }
}

run()

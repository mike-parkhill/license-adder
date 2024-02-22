#!/usr/bin/env node
import { Octokit } from "octokit";
import { simpleGit } from 'simple-git';
import * as fs from 'node:fs/promises';

const octokit = new Octokit({
  auth: process.env.ENV_GITHUB_PAT
});

export const getRepos = async allRepos => {
  console.log("Checking for repos...");
  const repos = await octokit.request("GET /search/repositories?q=org%3Adocknetwork");

  //console.log(repos);
  console.log(`Found ${repos.data.total_count} repos.`);

  if (repos.data.total_count == 0) {
    return;
  }

  const git = simpleGit();
  repos.data.items.map(async r => {
    if (r.license || r.private || r.archived) {
      return;
    }

    if (r.fork) {
      console.log(`Skipping fork ${r.name} ...`);
      return;
    }

    console.log(`Checking out ${r.name} ...`);

    try {
      const localPath = `repos/${r.name}`;
      await git.clone(r.ssh_url, localPath);

      await git.cwd(localPath);

      console.log(`Adding license file in ${r.name} ...`);
      await fs.copyFile("LICENSE", `${localPath}/LICENSE`);

      console.log(`Generating commit in ${r.name} ...`)
      await git.add(`LICENSE`);
      await git.commit("Adding license file.");

      console.log(`Pushing commit to ${r.name} ...`);
      await git.push("origin");

      console.log(`Cleaning up ${r.name} ...`);

      await fs.rm(localPath, { recursive: true, force: true });
      console.log(`Finished updating ${r.name}.`);
    } catch (error) {
      console.error(`Failed to update repo ${r.name}`, error);
    }
  });
}

await getRepos();


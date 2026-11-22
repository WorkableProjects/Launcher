// Launcher settings. Edit and redeploy — no build step.
window.LAUNCHER_CONFIG = {
  org: 'WorkableProjects',

  // Flip to true once the Launcher itself is live, so it gets a tile too.
  launcherLaunched: false,
  launcherRepo: 'Launcher',

  // Repos that never get a link (matched case-insensitively, spaces/dashes/underscores ignored).
  noLink: ['BloodDrive26'],

  // Optional per-repo link overrides: { 'RepoName': 'https://…' }
  links: {},

  // Hide forks and archived repos.
  hideForks: true,
  hideArchived: true,
};

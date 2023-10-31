---
title: "Contributing"
nav_order: 5
---
# WebPulse Analytics Contribution Guide

We welcome contributions to the WebPulse Analytics project, including the main backend as well as the developer
documentation. Your contributions help improve the project, clarify instructions, and enhance the user experience. This
guide outlines the process for contributing to both aspects of the project.

## Main Repository

The primary repository for the WebPulse Analytics can be found at
[https://github.com/pinta365/webpulsebackend](https://github.com/pinta365/webpulsebackend).

## Repository Layout

The WebPulse Analytics Backend repository has the following layout:

- `.vscode/` (Directory): Configuration files for Visual Studio Code
- `src/` (Directory): The source directory for the backend server.
- `docs/` (Directory): The source directory for the developer documentation
- `.env.example` (File): Example environment variables file.
- `.gitignore` (File): Configuration for Git to ignore specific files and directories.
- `README.md` (File): The project's README.
- `deno.jsonc` (File): Deno configuration file.
- `deps.ts` (File): Dependencies for the project.
- `mod.ts` (File): The main module of the project.

## How to Contribute

Follow these steps to contribute to the WebPulse Analytics:

1. Fork the Repository: Click the "Fork" button in the upper right corner of the repository page. This creates a copy of
   the repository in your GitHub account.

2. Clone the Repository: Clone the forked repository to your local machine using the `git clone` command. Replace
   `<your-username>` with your GitHub username.

   ```bash
   git clone https://github.com/<your-username>/webpulsebackend.git
   ```

3. Create a New Branch: Create a new branch to work on your changes. Use a descriptive name that relates to the changes
   you plan to make.

   ```bash
   git checkout -b my-fix
   ```

4. Make Your Changes

5. Commit Your Changes: Commit your changes with a meaningful commit message.

   ```bash
   git add .
   git commit -m "Fix issue #13"
   ```

6. Push Your Changes: Push your branch to your forked repository on GitHub.

   ```bash
   git push origin my-fix
   ```

7. Create a Pull Request: Go to your forked repository on GitHub, switch to the branch you just pushed, and click the
   "New Pull Request" button. Provide a title and description for your pull request, then submit it.

8. Review and Feedback: Your pull request will be reviewed by project maintainers. Be prepared to make changes or
   address feedback.

9. Merge Your Pull Request: Once your pull request is approved, project maintainers will merge it into the main
   repository.

## Contributing to the documentation

The documentation lives in `/docs` and is generated using Lumocs. Check out the
[Lumocs Documentation](https://lumocs.56k.guru) for more information on how works.

## Coding Standards

- Follow the existing documentation structure and formatting.
- Ensure that your content is clear and concise.
- Make sure your code examples are accurate.
- Proofread your contributions for spelling and grammar.

Thank you for your contributions to WebPulse Analytics!

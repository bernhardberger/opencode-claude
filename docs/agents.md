# Setting up opencode-claude: instructions for coding agents

This page is written for an AI coding agent that has been asked to install or
switch to `@bernhardberger/opencode-claude` on someone's machine. Follow it in
order. Stop and ask the human whenever a step says so. For background on why
this fork exists, see the [README](../README.md#why-this-fork-exists).

## What you are setting up

The plugin adds a provider with the ID `claude-code` to OpenCode 2.x. Requests
go through the official Claude Agent SDK and the user's own `claude` CLI, and
they count against the user's Claude Pro or Max plan. The plugin never handles
credentials.

## Rules

- **Never handle credentials.** Don't read, copy, print or edit anything under
  `~/.claude` or another `CLAUDE_CONFIG_DIR`. Don't set `ANTHROPIC_API_KEY`, and
  don't add tokens to any config.
- **Sign-in is the human's job.** `claude auth login` opens a browser and needs
  the user. If they're signed out, tell them the command and wait.
- **Change one thing only:** the plugin entry. Leave other plugins, providers,
  agents and permissions alone.
- **Keep the proxy local.** Don't expose the plugin's proxy port or forward it to
  other hosts.
- **Ask before you restart.** A restart interrupts running sessions.
- **Don't start a second server.** OpenCode CLI commands such as
  `opencode models` and `opencode plugin list` start a background server if
  they can't find one. If OpenChamber or a system service already runs OpenCode,
  pass `--server <that server's URL>`, or don't run those commands. Two servers
  on the same session database is something to avoid. If you start one by
  mistake, stop only the process you started and tell the human.

## 1. Check the prerequisites

```bash
opencode --version      # must be 2.x
claude --version        # Claude Code CLI must be installed
claude auth status      # must show a claude.ai subscription login
```

- If `opencode` is 1.x, stop. This plugin needs OpenCode 2.x. OpenCode 1.x
  users stay on `@openchamber/opencode-claude@0.14`.
- If `claude` is missing, ask the human to install it (`npm install -g @anthropic-ai/claude-code`, or the installer from Anthropic).
- If `claude auth status` shows an API key, Bedrock, Vertex, or no login, stop.
  The plugin only works on a Claude plan. Report what you saw. For API-key use,
  the built-in Anthropic provider is the right choice instead.

## 2. Find the config that loads plugins

Check these in order and use the first one that already has a `plugins` array.
If none has one, use the global config.

1. A project `opencode.json` or `opencode.jsonc` in the working directory, if
   the team configures plugins per project
2. `$OPENCODE_CONFIG_DIR/opencode.json`, if `OPENCODE_CONFIG_DIR` is set (common
   for shared or server installs)
3. `~/.config/opencode/opencode.json` (global)

`opencode plugin list` shows which plugins are loaded right now.

## 3. Edit the plugin entry

Pin an exact version so every machine on the team runs the same code. Look up
the current release:

```bash
npm view @bernhardberger/opencode-claude version
```

- **If the original plugin is there** (`@openchamber/opencode-claude`, with or
  without a version), replace only the package name and version. If the entry
  is an object with `options`, keep the options exactly as they are.

  ```diff
  -  "@openchamber/opencode-claude@1.7.0"
  +  "@bernhardberger/opencode-claude@1.7.2"
  ```

  ```diff
  -  { "package": "@openchamber/opencode-claude", "options": { "compactAt": 400000 } }
  +  { "package": "@bernhardberger/opencode-claude@1.7.2", "options": { "compactAt": 400000 } }
  ```

- **If neither is there**, append the plugin to `plugins`:

  ```json
  { "plugins": ["@bernhardberger/opencode-claude@1.7.2"] }
  ```

  `opencode plugin add @bernhardberger/opencode-claude` does the same in the
  global config, without pinning a version.

Never keep both packages in the list. They register the same provider ID.

The provider ID (`claude-code`) and model IDs don't change between the original
and this fork, so saved model selections and agent configs that name
`claude-code/...` models keep working.

## 4. Restart

Ask the human first. Then restart whichever process owns OpenCode:

- OpenCode background service: `opencode service restart`
- OpenChamber: restart OpenChamber. It starts its own OpenCode server.
- Standalone TUI or `opencode run`: just start it again.

## 5. Verify

```bash
opencode plugin list                 # shows @bernhardberger/opencode-claude
opencode models | grep '^claude-code/'
```

Pick one of the listed model IDs, then run:

```bash
opencode run "Reply with the single word: ready" --model claude-code/<model-id>
```

Use an ID from the list. Aliases like `opus` aren't valid model IDs here.

If it fails, add `"options": { "debug": true }` to the plugin entry, restart,
run the test again, and read `~/.local/share/opencode-claude/debug.log`. The
README's troubleshooting table covers the common errors.

## 6. Report back

Tell the human:

- which config file you changed, with the old and new plugin entry
- OpenCode, Claude Code and plugin versions
- the `claude-code/...` models that were listed
- whether the test reply worked

## Undoing it

Put the old plugin entry back, or remove the entry, and restart again.

## Notes

- **OpenChamber 2.8 and later** removes `@openchamber/opencode-claude` from
  configs it manages and switches people to OpenCode's built-in Claude
  provider. It doesn't touch this package, because the name is different. If a
  user upgraded OpenChamber and lost the Claude Code provider, that removal is
  the likely cause, and this page fixes it.
- **Billion Context users:** this fork's main fix is for Billion Context. Leave
  that plugin's entry as it is. Context plugins that rewrite history on every
  turn make Claude much more expensive. See "Keeping usage down" in the README.

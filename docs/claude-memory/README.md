# Claude session memory

Persistent memory files from the machine where the PCB + enclosure work was done.
To install on a new machine, copy the .md files (not this README) into Claude Code's
memory directory for whatever project folder you run it from:

    ~/.claude/projects/<project-path-key>/memory/

(`<project-path-key>` = the working directory path with slashes replaced by dashes;
the directory is created after the first Claude Code session there. Also append a
one-line index entry per file to MEMORY.md in that folder.)

Or simpler: just tell Claude "read docs/claude-memory/ and save what's relevant
to your memory" — it will import them itself.

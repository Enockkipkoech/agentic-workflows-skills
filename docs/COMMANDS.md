## Claude Commands

1. claude "message"
2. claude -p "message"
3. tail -n 200 app.lg | claude -p "analyse the logs and give me a summary of the errors"
4. /model, /context, /clear, 
5. ctrl + G :- Preview prompt response 
6. /claude -r , /claude 
7. /skills-doctor, 


## settings.json (.claude/settings.json)

```json
{
  "permissions":{
    "allow":[
        "Bash(pnpm build)",
        "Bash(pnpm test *)",
        "Bash(pnpm typecheck)",
        "Bash(pnpm dev)",
        "Bash(git status)",
        "Bash(git diff *)"
    ],
    "ask":[
    "Bash(git push *)"
    ],
    "deny":[
        "Read(.env)",
        "Read{.env.*}",
        "Edit(.env)",
        "Edit{.env.*}",
    ]
  }
}
``` 

## FEature development process
Describe -> plan -> build -> Review -> verify -test -> commit -> Repeat

## Skills and plugins
1. npx skills@latest add <github-username>/<repo-name>/skills
2. claude plugin install <official plugin link>

## summary
-  Context, Permissions, Plan, Skills, subagents, WOrktrees, MCP, Hooks, Verify.

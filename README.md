# punching-slack-bolt-lambda

Sample project to run slack framework bolt with Typescript on AWS Lambda managed by Serverless Framework

```bash
# node 10.13+ required
# 0) Create a new project with this template
yarn global add serverless
serverless create \
  --template-url https://github.com/irongineer/punching-slack-bolt-lambda/tree/master \
  --path punching-slack-bolt-lambda

# 1) Slack App Configuration
# Go to https://api.slack.com/apps
#   - Create a Slash command named `/echo_me` (Request URL can be a dummy)
#   - Create a Slash command named `/clock` (Request URL can be a dummy)
#   - Create a Global Shortcut command named `/start_clock` (Request URL can be a dummy)
#   - Create a bot user @{bot-name}
#   - Add user scope `profile:write`
#   - Install the app to your workspace

# 2) App Setup
yarn global add serverless
yarn
cp _env .env
vi .env
# Set Environment Variables
#   - SLACK_SIGNING_SECRET
#   - SLACK_APP_ID
#   - SLACK_BOT_TOKEN
#   - SLACK_USER_TOKEN
source .env

# 3) Local Development
sls offline # local dev
ngrok http 3000 # on another terminal window

# Update the Request URL for the slash command with the ngrok URL

# 4) Make sure it works on Slack
#  `Clock Time Record` on Global Shortcuts
#  `/clock` on Slash Commands

# 5) Deploy to AWS
export AWS_ACCESS_KEY_ID=xxx
export AWS_SECRET_ACCESS_KEY=yyy
sls deploy

# Update the Request URL for the slash command with the deployed AWS URL
```

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
#   - Create a Slash Command named `/clock` in 'Slash Commands' tab (Request URL can be a dummy)
#   - Create a Global Shortcut named `Clock Time Record` and Callback ID `clock` in 'Interactivity & Shortcuts' tab (Request URL can be a dummy)
#   - Create a bot user @{bot-name} in 'App Home' Tab
#   - Add bot scopes `chat:write` in 'OAuth & Permissions' tab
#   - Add user scopes `profile:write` in 'OAuth & Permissions' tab
#   - Install the app to your workspace in 'OAuth & Permissions' tab
#   - Get Environment Variables from 'Basic Information' and 'OAuth & Permissions' tab

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

# Update the Request URL for the 'Slash Commands' and 'Interactivity & Shortcuts' with the ngrok URL
# ex) https://xxxxxxxxxxx.ngrok.io/dev/slack/events

# 4) Make sure it works on Slack
#  1. Add app to a target channel for sharing punching
#  2. Try punching commands below
#  - `Clock Time Record` on Global Shortcuts
#  - `/clock` on Slash Commands
#  3. Check it works
#  - Open the punching modal
#  - Punch a time record you clicked action button
#  - Change to the status according to the selected time record type
#  - Share your time record to the channel you selected

# 5) Deploy to AWS
export AWS_ACCESS_KEY_ID=xxx
export AWS_SECRET_ACCESS_KEY=yyy
sls deploy

# Update the Request URL for the 'Slash Commands' and 'Interactivity & Shortcuts' with the deployed AWS URL
# ex) https://xxxxxxxxxx.execute-api.ap-northeast-1.amazonaws.com/dev/slack/events
```

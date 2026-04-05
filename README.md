<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1yhlFBXTeod0KG7Qp-P48cRACXGmYH2XQ

## Run Locally

**Prerequisites:** Node.js

1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Notes

- Chat member counter: Shows the number of members in the active track. Removing a user via the Admin panel also removes them from all track member lists.
- Chat pins: All users can pin and unpin any message; deletion remains restricted to admins or the message author. Pinned messages appear above the conversation for quick reference.

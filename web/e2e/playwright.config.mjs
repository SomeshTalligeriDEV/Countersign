import {defineConfig} from '@playwright/test';
// PW_PORT / PW_PROD=1 (next start on an existing build) let e2e run beside a developer's own dev server.
const port=process.env.PW_PORT??'3000';
const url=`http://127.0.0.1:${port}`;
const command=process.env.PW_PROD?`npm --prefix .. run start -- --hostname 127.0.0.1 -p ${port}`:`npm --prefix .. run dev -- --hostname 127.0.0.1 -p ${port}`;
export default defineConfig({testDir:'.',fullyParallel:false,use:{baseURL:url,...(process.env.PW_CHANNEL?{channel:process.env.PW_CHANNEL}:{})},webServer:{command,url,reuseExistingServer:!process.env.CI},reporter:[['list'],['html',{open:'never'}]]});

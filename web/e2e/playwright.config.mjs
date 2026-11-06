import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'.',fullyParallel:false,use:{baseURL:'http://127.0.0.1:3000'},webServer:{command:'npm --prefix .. run dev -- --hostname 127.0.0.1',url:'http://127.0.0.1:3000',reuseExistingServer:!process.env.CI},reporter:[['list'],['html',{open:'never'}]]});

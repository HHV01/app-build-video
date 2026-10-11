import test from 'node:test';
import assert from 'node:assert/strict';
import {renderProviderSettings} from './public/provider-settings.mjs';
const helpers={esc:s=>String(s||'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;'),btn:(text,action,style,attributes)=>`<button data-action="${action}" ${attributes}>${text}</button>`};
test('direct provider UI has empty password inputs, independent save actions and persisted model choices',()=>{
 const html=renderProviderSettings({geminiConfigured:true,xaiConfigured:false,model:'gemini/google-two',providerModels:{gemini:['google-one','google-two'],xai:['grok-one']},geminiKey:'PRIVATE_GEMINI',xaiKey:'PRIVATE_XAI'},helpers);
 assert.match(html,/id="gemini-key" type="password"/);assert.match(html,/id="xai-key" type="password"/);assert.doesNotMatch(html,/PRIVATE_GEMINI|PRIVATE_XAI/);
 assert.match(html,/value="google-two" selected/);assert.match(html,/value="grok-one"/);assert.match(html,/data-action="save-provider-key"[^>]*data-provider="gemini"/);assert.match(html,/data-action="save-provider-key"[^>]*data-provider="xai"/);
 assert.match(html,/Grok là xAI, khác với Groq/);
});
test('Groq has a separate password field and provider/model controls',()=>{
 const html=renderProviderSettings({groqConfigured:true,model:'groq/openai/gpt-oss-120b',providerModels:{groq:['openai/gpt-oss-120b']},groqKey:'PRIVATE_GROQ'},helpers);
 assert.match(html,/id="groq-key" type="password"/);assert.match(html,/value="openai\/gpt-oss-120b" selected/);assert.match(html,/data-provider="groq"/);assert.doesNotMatch(html,/PRIVATE_GROQ/);
});

// 測試用：假的語音與音檔（瀏覽器自動測試時用）
(() => {
  const voices=[{name:'Mei-Jia',lang:'zh-TW',voiceURI:'mj',localService:true,default:true}];
  const ss={speaking:false,pending:false,paused:false,getVoices:()=>voices,cancel(){this._c&&clearTimeout(this._c)},resume(){},pause(){},addEventListener(){},removeEventListener(){},
    speak(u){window.__spoken=(window.__spoken||[]);window.__spoken.push(u.text);setTimeout(()=>u.onstart&&u.onstart(),10);this._c=setTimeout(()=>u.onend&&u.onend(),60);}};
  Object.defineProperty(window,'speechSynthesis',{value:ss,configurable:true});
  window.SpeechSynthesisUtterance=function(t){this.text=t};
  HTMLMediaElement.prototype.play=function(){const el=this;setTimeout(()=>el.onended&&el.onended(),30);return Promise.resolve()};
})();

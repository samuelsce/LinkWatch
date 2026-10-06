export const themeStorageKey = "linkwatch.theme";

// Only a validated theme reaches the DOM. No request or user content enters this script.
export const themeInitScript = `(()=>{let t;try{t=localStorage.getItem(${JSON.stringify(themeStorageKey)})}catch{}document.documentElement.dataset.theme=t==='light'||t==='dark'?t:matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'})()`;

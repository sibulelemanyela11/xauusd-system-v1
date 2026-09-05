const checks=[
['H4 Structure','WAIT'],['H1 Bias','WAIT'],['M15 Setup','WAIT'],['M5 Trigger','WAIT'],
['Session','CHECK'],['News Filter','CHECK'],['Risk Engine','PASS'],['R:R','PASS']];
document.getElementById('checks').innerHTML=checks.map(x=>`<div class="check">${x[0]} <b>${x[1]}</b></div>`).join('');

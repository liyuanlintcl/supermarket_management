$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$session.UserAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36"
Invoke-WebRequest -UseBasicParsing -Uri "https://bff.gds.org.cn/gds/searching-api/ProductService/ProductListByGTIN?PageSize=30&PageIndex=1&SearchItem=06914068019529" `
-WebSession $session `
-Headers @{
"Accept"="application/json, text/plain, */*"
  "Accept-Encoding"="gzip, deflate, br, zstd"
  "Accept-Language"="zh-CN,zh;q=0.9"
  "Authorization"="Bearer eyJhbGciOiJSUzI1NiIsImtpZCI6IkUxNDY5RDU1QkE3Q0Q3NTI3MEI5MDcyOTIxMzY2NjJCQTE4OEYxOEVSUzI1NiIsInR5cCI6ImF0K2p3dCIsIng1dCI6IjRVYWRWYnA4MTFKd3VRY3BJVFptSzZHSThZNCJ9.eyJuYmYiOjE3NzUzMTY1NDgsImV4cCI6MTc3NTMzODE0OCwiaXNzIjoiaHR0cHM6Ly9wYXNzcG9ydC5nZHMub3JnLmNuIiwiY2xpZW50X2lkIjoidnVlanNfY29kZV9jbGllbnQiLCJzdWIiOiIyODMwNTc0IiwiYXV0aF90aW1lIjoxNzc1MzE2NTQxLCJpZHAiOiJsb2NhbCIsInJvbGUiOiJNaW5lIiwiVXNlckluZm8iOiJ7XCJVc2VyTmFtZVwiOm51bGwsXCJCcmFuZE93bmVySWRcIjowLFwiQnJhbmRPd25lck5hbWVcIjpudWxsLFwiR2NwQ29kZVwiOm51bGwsXCJVc2VyQ2FyZE5vXCI6XCLmmoLml6Dkv6Hmga9cIixcIklzUGFpZFwiOmZhbHNlLFwiQ29tcGFueU5hbWVFTlwiOm51bGwsXCJDb21wYW55QWRkcmVzc0NOXCI6bnVsbCxcIkNvbnRhY3RcIjpudWxsLFwiQ29udGFjdFRlbE5vXCI6bnVsbCxcIkdjcExpY2Vuc2VIb2xkZXJUeXBlXCI6bnVsbCxcIkxlZ2FsUmVwcmVzZW50YXRpdmVcIjpudWxsLFwiVW5pZmllZFNvY2lhbENyZWRpdENvZGVcIjpudWxsfSIsIlY0VXNlckluZm8iOiJ7XCJVc2VyTmFtZVwiOlwibGl5dWFubGluMTIxMlwiLFwiRW1haWxcIjpudWxsLFwiUGhvbmVcIjpcIjE4NDc0MzQwMTMyXCIsXCJDYXJkTm9cIjpcIlwifSIsImp0aSI6IkNEMzQzODNCQTFCQUYwRjgzMzMxREE0MTI4NzE3QTkxIiwic2lkIjoiQTQyQUI1REE1NUU5NENGQjJEQ0U3MzlDQzY1NjkxMUMiLCJpYXQiOjE3NzUzMTY1NDgsInNjb3BlIjpbIm9wZW5pZCIsInByb2ZpbGUiLCJhcGkxIiwib2ZmbGluZV9hY2Nlc3MiXSwiYW1yIjpbInB3ZCJdfQ.fDRh6QVP3gcSQ5ga47qKJoPIEsl75AzTuTbZh1nIOjhH2fCwumdRZ1DFUvCv0_yjuDtg-w62ffokeEGlls3cpPpdtNpW9MvIy8_zbeHDzrkf_KewrtE7GlVzLkECB_zMDi-k4x1jMeAi68hrytzpyGRi9XKJgrGm_3wnZ7kkTknnX3XN2Y7c_JkjoLVL-8BpSWUD_0VhDWfs-8YZtyV0CepvyrH4cdSqkm-IoNa1wVb2LrgZZ2Zua37Xjbhw65YBYbyI8zFM4SsX7g30u6thdkmXi-I6ID3NJ4pIhFKPHJR6RAOl31zpUm5mcwSK__HXFMqlfgcHtdazUCNUGiKmOg"
  "Origin"="https://www.gds.org.cn"
  "Sec-Fetch-Dest"="empty"
  "Sec-Fetch-Mode"="cors"
  "Sec-Fetch-Site"="same-site"
  "currentRole"="Mine"
  "sec-ch-ua"="`"Chromium`";v=`"146`", `"Not-A.Brand`";v=`"24`", `"Google Chrome`";v=`"146`""
  "sec-ch-ua-mobile"="?0"
  "sec-ch-ua-platform"="`"Windows`""
}
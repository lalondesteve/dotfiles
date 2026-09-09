local sysname = vim.uv.os_uname().sysname

return {
  is_win = sysname == "Windows_NT",
  is_mac = sysname == "Darwin",
  is_linux = sysname == "Linux",
}

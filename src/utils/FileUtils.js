let { File, ChatUtils } = global.export

let configName = "PolarConfigV2"
function existsFile(configName, FileName) {
   return FileLib.exists(configName, FileName)
}

function deleteFile(configName, FileName) {
   FileLib.delete(configName, FileName)
}

function fileBroken(configName, FileName) {
   let config = FileLib.read(configName, FileName)
   try {
      JSON.parse(config)
   } catch (error) {
      ChatUtils.sendModMessage("Replaced corrupted file: " + FileName)
      deleteFile(configName, FileName)
      return true
   }
   return false
}

function makeDir(Name) {
   let dir = new File("./config/ChatTriggers/modules/" + configName, Name)
   dir.mkdir()
}

function makeFile(Path, Content) {
   FileLib.append(configName, Path, Content)
}

// Makes the base folder
if(!existsFile("./config/ChatTriggers/modules", configName)) {
   let dir = new File("./config/ChatTriggers/modules/", configName)
   dir.mkdir()
}

let Files = [
   // Base Files
   {
      path: "polarconfig.json",
      FileType: "file",
      Content: []
   },
   {
      path: "keybinds.json",
      FileType: "file",
      Content: []
   },
   {
      path: "dev.json",
      FileType: "file",
      Content: []
   },

   // Routes

   {
      path: "gemstoneroutes",
      FileType: "dir"
   },
   {path: "gemstoneroutes/custom1.txt", FileType: "file", Content: []},
   {path: "gemstoneroutes/custom2.txt", FileType: "file", Content: []},
   {path: "gemstoneroutes/custom3.txt", FileType: "file", Content: []},
   {path: "gemstoneroutes/custom4.txt", FileType: "file", Content: []},
   {path: "gemstoneroutes/custom5.txt", FileType: "file", Content: []},
   {path: "gemstoneroutes/custom6.txt", FileType: "file", Content: []},
   {path: "gemstoneroutes/custom7.txt", FileType: "file", Content: []},
   {path: "gemstoneroutes/custom8.txt", FileType: "file", Content: []},
   {path: "gemstoneroutes/custom9.txt", FileType: "file", Content: []},

   {
      path: "routewalkerroutes",
      FileType: "dir"
   },
   {path: "routewalkerroutes/custom1.txt", FileType: "file", Content: []},
   {path: "routewalkerroutes/custom2.txt", FileType: "file", Content: []},
   {path: "routewalkerroutes/custom3.txt", FileType: "file", Content: []},
   {path: "routewalkerroutes/custom4.txt", FileType: "file", Content: []},
   {path: "routewalkerroutes/custom5.txt", FileType: "file", Content: []},
   {path: "routewalkerroutes/custom6.txt", FileType: "file", Content: []},
   {path: "routewalkerroutes/custom7.txt", FileType: "file", Content: []},
   {path: "routewalkerroutes/custom8.txt", FileType: "file", Content: []},
   {path: "routewalkerroutes/custom9.txt", FileType: "file", Content: []},

   {
      path: "tunnelroutes",
      FileType: "dir"
   },
   {path: "tunnelroutes/custom1.txt", FileType: "file", Content: []},
   {path: "tunnelroutes/custom2.txt", FileType: "file", Content: []},
   {path: "tunnelroutes/custom3.txt", FileType: "file", Content: []},
   {path: "tunnelroutes/custom4.txt", FileType: "file", Content: []},
   {path: "tunnelroutes/custom5.txt", FileType: "file", Content: []},
   {path: "tunnelroutes/custom6.txt", FileType: "file", Content: []},
   {path: "tunnelroutes/custom7.txt", FileType: "file", Content: []},
   {path: "tunnelroutes/custom8.txt", FileType: "file", Content: []},
   {path: "tunnelroutes/custom9.txt", FileType: "file", Content: []},

   // GUI Config

   {path: "themes", FileType: "dir"},
   {path: "themes/sapphire.json", FileType: "file", Content: {"name":"Sapphire","author":"Farlow","colours":{"panel":-15526631,"box":-15724013,"background":-15987185,"selection":-14736599,"logo":-12394251,"text":-1,"accent":-12394251,"buttonBackground":-15066080}} },
   {path: "themes/amber.json", FileType: "file", Content: {"name":"Amber","author":"Farlow","colours":{"panel":-14935012,"box":-15132391,"background":-15066598,"selection":-8289919,"logo":-1,"text":-1,"accent":-23782,"buttonBackground":-15066080}} },
   {path: "themes/ruby.json", FileType: "file", Content: {"name":"Ruby","author":"Farlow","colours":{"panel":-15526631,"box":-15724013,"background":-15987185,"selection":-14736599,"logo":-1291694,"text":-1,"accent":-1291694,"buttonBackground":-15066080}} },
   {path: "themes/opal.json", FileType: "file", Content: {"name":"Opal","author":"Farlow","colours":{"panel":-15526631,"box":-15724013,"background":-15987185,"selection":-14736599,"logo":-1,"text":-1,"accent":-1,"buttonBackground":-15066080}} },
   {path: "themes/gunmetal-azure.json", FileType: "file", Content: {"name":"Gunmetal Azure","author":"Farlow","colours":{"panel":-14075835,"box":-14338751,"background":-14603208,"selection":-14736599,"logo":-6627841,"text":-6630180,"accent":-10718998,"buttonBackground":-15066080}} },
   {path: "themes/classic.json", FileType: "file", Content: {"name":"Classic","author":"Farlow","colours":{"panel":3223857,"box":2302755,"background":2302755,"selection":986895,"logo":16379097,"text":-1,"accent":4366591,"buttonBackground":986895}} },

   {path: "theme.json", FileType: "file", Content: {"name":"Sapphire","author":"Farlow","colours":{"panel":-15526631,"box":-15724013,"background":-15987185,"selection":-14736599,"logo":-12394251,"text":-1,"accent":-12394251,"buttonBackground":-15066080}} },
   {path: "guiconfig.json", FileType: "file", Content: {"editor":{"themes":{"customPos":true,"x":0.5583333333333333,"y":0.3227722772277228},"editor":{"customPos":true,"x":0.1114583333333334,"y":0.3}},"main":{"customPos":true,"x":0.1907291666666667,"y":0.11089108910891089},"hud":{}} },
]

// Handles all the extra files
Files.forEach((FileData) => {
   if(!existsFile(configName, FileData.path) || fileBroken(configName, FileData.path)) {
      if(FileData.FileType === "file") {
         makeFile(FileData.path, JSON.stringify(FileData.Content, null, 2))
      }
      if(FileData.FileType === "dir") {
         makeDir(FileData.path)
      }
   }
})
const discord = require('discord.js')
const fs = require('fs');
const client = new discord.Client({
  disableEveryone: true,
  partials: ["MESSAGE", "REACTION"]
});

const db = require("quick.db");
const config = require('./config.json')

client.commands = new discord.Collection();
client.aliases = new discord.Collection();
client.queue = new Map();





const Categories = ["rr"]; //Commands => Category => Command

Categories.forEach(async function(Category) { //
    fs.readdir(`./commands/${Category}`, async function(error, files) {
      if (error) throw new Error(`Error In Command - Command Handler\n${error}`);
      files.forEach(async function(file) {
        if (!file.endsWith(".js")) throw new Error(`A File Does Not Ends With .js - Command Handler!`);
        let command = require(`./commands/${Category}/${file}`);
   
        if (!command.name || !command.aliases) throw new Error(`No Command Name & Command Aliases In A File - Command Handler!`);
        if (command.name) client.commands.set(command.name, command);
        if (command.aliases) command.aliases.forEach(aliase => client.aliases.set(aliase, command.name));
        if (command.aliases.length === 0) command.aliases = null;
      });
    });
});

client.on("message", async message => {

  let Prefix = config.prefix

  if (message.author.bot || !message.guild || message.webhookID) return;





  if (!message.content.startsWith(Prefix)) return;

  let args = message.content.slice(Prefix.length).trim().split(/ +/g);
  let cmd = args.shift().toLowerCase();

  let command = client.commands.get(cmd) || client.commands.get(client.aliases.get(cmd));

  if (!command) return console.log(`No Command Found!`);



  if (command) {
    command.run(client, message, args);
  };
});



client.login(process.env.TOKEN).catch(err => console.log(`Invalid Token Provided!`));

















client.on("messageReactionAdd", async (reaction, user) => {
  if (user.bot) return
  let message = await reaction.message;
  if (
    message.reactions.cache.forEach(reaction =>
      reaction.users.cache.has(user.id)
    )
  ) {
    console.log("yes");
  }
  let menus = db.get(`rr_${message.guild.id}`);
  let menu;
  let menuIndex;
  if (!menus) return;
  for (let i = 0; i < menus.length; i++) {
    if (menus[i].ChannelID == message.channel.id && menus[i].ID == message.id) {
      menuIndex = i;
      menu = menus[i];
    }
  }
  if (!menu) return;
  let role;
  for (let i = 0; i < menu.roles.length; i++) {
    let type = reaction.emoji.id ? reaction.emoji.id : reaction.emoji.name;
    if (type == menu.roles[i].reaction) {
      role = menu.roles[i].role;
    }
  }
  if (menu.type != "single") {
    role = message.guild.roles.cache.find(x => x.id == role);
    if (!role) return;
    let member = message.guild.members.cache.find(x => x.id == user.id);
    if (!member) return;
    if (member.roles.cache.has(role.id)) return;
    member.roles.add(role.id);
    return;
  } else {
    console.log(menu.usersReacted)
    if (menu.usersReacted.includes(user.id)){
      await reaction.users.remove(user.id);
      return user
        .send(
          "You have already took role from this reaction set and you cannot take another!"
        )
        .catch(e => {
          return;
        });
    }
    role = message.guild.roles.cache.find(x => x.id == role);
    if (!role) return;
    let member = message.guild.members.cache.find(x => x.id == user.id);
    if (!member) return;
    if (member.roles.cache.has(role.id)) return;
    member.roles.add(role.id);
    menu.usersReacted.push(user.id);
    menus[menuIndex] = menu;
    db.set(`rr_${message.guild.id}`, menus);
    return;
  }
}); 


client.on("messageReactionRemove", async (reaction, user) => {
  if (user.bot) return
  let message = await reaction.message;
  let menus = db.get(`rr_${message.guild.id}`);
  let menu;
  let menuIndex;
  if (!menus) return;
  for (let i = 0; i < menus.length; i++) {
    if (menus[i].ChannelID == message.channel.id && menus[i].ID == message.id) {
      menu = menus[i];
      menuIndex = i;
    }
  }
  if (!menu) return;
  let role;
  for (let i = 0; i < menu.roles.length; i++) {
    let type = reaction.emoji.id ? reaction.emoji.id : reaction.emoji.name;
    if (type == menu.roles[i].reaction) {
      role = menu.roles[i].role;
    }
  }
  if (menu.type != "single") {
    role = message.guild.roles.cache.find(x => x.id == role);
    if (!role) return;
    let member = message.guild.members.cache.find(x => x.id == user.id);
    if (!member) return;
    if (!member.roles.cache.has(role.id)) return;
    member.roles.remove(role.id);
    return;
  } else {
    role = message.guild.roles.cache.find(x => x.id == role);
    if (!role) return;
    let member = message.guild.members.cache.find(x => x.id == user.id);
    if (!member) return;
    if (!member.roles.cache.has(role.id)) return;
    console.log(menu.usersReacted)
    if (menu.usersReacted.includes(user.id)) {
      let index;
      for (let i = 0; i < menu.usersReacted.length; i++) {
        if (menu.usersReacted[i] == user.id) {
          index = i;
        }
      }
      if (index != -1) {
        menu.usersReacted.splice(index, 1);
        console.log(menu.usersReacted)
        menus[menuIndex] = menu;
        db.set(`rr_${message.guild.id}`, menus);
      }
    }
    member.roles.remove(role.id);
    return;
  }
});

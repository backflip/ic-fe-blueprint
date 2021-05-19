module.exports.prepareTemplate = function (template) {
  const replaced = template
    // Remove unsupported parts
    .replace(/data-sly-use\.templates?=(["'])core.*?\1/g, '')
    .replace(/<sly[^>]+data-sly-call=(["']).*?\1.*?><\/sly>/g, '')
    // Replace slashes in resource paths with dashes to prevent conflicts between mock files and directories with the same name
    .replace(/(data-sly-resource="\${\s+')(.*?)(')/g, (match, p1, p2, p3) => `${p1}${p2.replace(/\//g, '-')}${p3}`)

  return replaced
}

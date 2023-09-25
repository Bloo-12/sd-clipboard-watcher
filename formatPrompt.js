export default function formatPrompt(s, useFormatting = true) {
  if (!useFormatting) {
    return s;
  }
  let formatted = removeLoras(s);

  return formatted.trim();
}

function removeLoras(s) {
  return s.replace(/<[^>]*>/g, '')
}
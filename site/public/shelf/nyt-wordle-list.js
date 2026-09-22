/*
 * Wordle-compatible lists from https://github.com/stuartpb/wordles.
 * The repository describes the lists as public-domain word data and keeps
 * the answer and accepted-guess lists separate, like the NYT game does.
 * HVN keeps a local SCOWL fallback so Wordle still opens offline.
 */
(() => {
  const source = "https://raw.githubusercontent.com/stuartpb/wordles/main/";
  const load = (file) => fetch(`${source}${file}`, { cache: "force-cache" }).then((response) => {
    if (!response.ok) throw new Error(`Could not load ${file}`);
    return response.json();
  });

  window.wordleListPromise = Promise.all([load("wordles.json"), load("nonwordles.json")])
    .then(([solutions, guesses]) => {
      const clean = (words) => words.filter((word) => /^[a-z]{5}$/.test(word)).map((word) => word.toUpperCase());
      const answerList = clean(solutions);
      const guessList = clean(guesses);
      window.wordleSolutions = answerList;
      if (typeof vaultDictionary !== "undefined") {
        vaultDictionary.clear();
        [...answerList, ...guessList].forEach((word) => vaultDictionary.add(word));
      }
      return { answerList, guessList };
    })
    .catch(() => null);
})();

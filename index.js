const express = require("express");
const axios = require("axios");

const app = express();
const PORT = process.env.PORT || 3000;

const MAX_SPINS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

app.set("view engine", "ejs");
app.use(express.static("public"));

// reads the spin counter from the browser's cookie
function readSpins(req) {
  const match = (req.headers.cookie || "").match(/(?:^|;\s*)spins=([^;]*)/);
  if (match) {
    try {
      const data = JSON.parse(decodeURIComponent(match[1]));
      if (Number.isInteger(data.count) && Date.now() - data.start < DAY_MS) {
        return data;
      }
    } catch (e) {}
  }
  return { start: Date.now(), count: 0 };
}

// home page with the "Surprise Me" button
app.get("/", (req, res) => {
  res.render("index", { cocktail: null, error: null });
});

// fetch a random cocktail and display it
app.get("/random", async (req, res) => {
  const spins = readSpins(req);

  if (spins.count >= MAX_SPINS) {
    return res.render("index", {
      cocktail: null,
      error: null,
      limitReached: true,
    });
  }

  try {
    const response = await axios.get(
      "https://www.thecocktaildb.com/api/json/v1/1/random.php"
    );
    const drink = response.data.drinks[0];

    // ingredients come as strIngredient1..15, so collect the ones that exist
    const ingredients = [];
    for (let i = 1; i <= 15; i++) {
      const ingredient = drink[`strIngredient${i}`];
      const measure = drink[`strMeasure${i}`];
      if (ingredient) {
        ingredients.push({
          name: ingredient,
          measure: measure ? measure.trim() : "",
        });
      }
    }

    const cocktail = {
      id: drink.idDrink,
      name: drink.strDrink,
      image: drink.strDrinkThumb,
      category: drink.strCategory,
      glass: drink.strGlass,
      alcoholic: drink.strAlcoholic,
      instructions: drink.strInstructions,
      ingredients: ingredients,
    };

    // only count the spin once the drink actually loaded
    spins.count++;
    res.cookie("spins", JSON.stringify(spins), {
      maxAge: DAY_MS,
      httpOnly: true,
      sameSite: "lax",
    });

    res.render("index", { cocktail: cocktail, error: null });
  } catch (err) {
    console.error("API error:", err.message);
    res.render("index", {
      cocktail: null,
      error: "Couldn't get a cocktail right now. Try again!",
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
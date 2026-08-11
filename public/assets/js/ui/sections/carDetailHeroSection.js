import { Card } from "../composites/card.js";
import { tw } from "../theme/tailwindClasses.js";
import { formatCurrency } from "../../utils/formatCurrency.js";

export function CarDetailHeroSection({ car = null } = {}) {
  const title = document.createElement("h1");
  title.className = "text-xl font-bold tracking-normal text-gray-950";
  title.textContent = car ? [car.brand_name, car.model_name].filter(Boolean).join(" ") : "Detail mobil";

  const price = document.createElement("p");
  price.className = `text-base font-semibold ${tw.text.price}`;
  price.textContent = formatCurrency(car?.price_discount ?? car?.price_cash);

  return Card([title, price]);
}

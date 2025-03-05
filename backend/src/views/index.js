import { Router } from "express";

const pagesRouter = Router();

pagesRouter.get("/", (req, res) => {
  res.render("index", { title: "Home" });
});
pagesRouter.get("/shop", (req, res) => {
  res.render("shop", { title: "Shop", showBreadCrumbs: true, pageName: "Beauty & Cosmetics", pathName: "Shop New Products" });
});
pagesRouter.get("/about", (req, res) => {
  res.render("about", { title: "About" });
});
pagesRouter.get("/contact", (req, res) => {
  res.render("contact", { title: "Contact", showBreadCrumbs: true, pageName: "Contact Us", pathName: "contact"});
});
pagesRouter.get("/compare", (req, res) => {
  res.render("compare", { title: "Compare", showBreadCrumbs: true, pageName: "Compare", pathName: "compare"});
});
// pagesRouter.get("/:category", (req, res) => {
//   // pageName & pathName are used to set the breadcrumbs and will be gotten from the database later
//   res.render("category", { title: req.params.category, category: req.params.category, showBreadCrumbs: true, pageName: req.params.category, pathName: req.params.category });
// });

export default pagesRouter;

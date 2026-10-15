import { defineModule } from "@forinda/kickjs";
import { HelloController } from "./hello.controller";

export const HelloModule = defineModule({
  name: "HelloModule",
  build: () => ({
    routes: () => ({ path: "/hello", controller: HelloController }),
  }),
});

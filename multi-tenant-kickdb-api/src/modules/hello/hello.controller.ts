import { Controller, Get, Autowired, type Ctx } from "@forinda/kickjs";
import { Public } from "../../auth";
import { HelloService } from "./hello.service";

@Controller()
@Public
export class HelloController {
  @Autowired() private readonly helloService!: HelloService;

  @Get("/")
  index(_ctx: Ctx<KickRoutes.HelloController["index"]>) {
    return this.helloService.greet("World");
  }

  @Get("/health")
  health(_ctx: Ctx<KickRoutes.HelloController["health"]>) {
    return this.helloService.healthCheck();
  }
}

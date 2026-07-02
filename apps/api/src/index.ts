import "dotenv/config";
import { createApp } from "./app";
import { startOutboxWorker } from "./modules/commerce/events/outbox-scheduler";
import { startStaleOfferScheduler } from "./modules/commerce/fulfillment/stale-offer-scheduler";

const port = Number(process.env.PORT ?? 4000);
const app = createApp();

app.listen(port, () => {
  console.log(`API server listening on port ${port}`);
});

startStaleOfferScheduler();
startOutboxWorker();

import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CreateBasketPage } from './pages/create-basket/create-basket.page';
import { CustomBasketPage } from './pages/custom-basket/custom-basket.page';
import { BasketsPage } from './pages/baskets/baskets.page';

const routes: Routes = [
  {
    path: '',
    component: BasketsPage,
  },
  {
    path: 'create-basket',
    component: CreateBasketPage,
  },
  {
    path: 'custom-basket',
    component: CustomBasketPage,
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class BasketsRoutingModule {
}
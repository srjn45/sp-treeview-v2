import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { MatProgressBarModule } from "@angular/material";

import { AppComponent } from './app.component';
import { SpTreeviewModule } from './sp-treeview/sp-treeview.module';


@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    BrowserModule,
    MatProgressBarModule,
    SpTreeviewModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }

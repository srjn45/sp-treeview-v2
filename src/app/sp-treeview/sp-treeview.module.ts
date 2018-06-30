import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SpTreeviewNodeComponent } from './sp-treeview-node/sp-treeview-node.component';
import { MatProgressBarModule, MatCheckboxModule, MatRadioModule, MatButtonModule, MatIconModule } from '@angular/material';

@NgModule({
  imports: [
    CommonModule,
    MatProgressBarModule,
    MatCheckboxModule,
    MatRadioModule,
    MatButtonModule,
    MatIconModule
  ],
  declarations: [SpTreeviewNodeComponent],
  exports: [
    SpTreeviewNodeComponent
  ]
})
export class SpTreeviewModule { }

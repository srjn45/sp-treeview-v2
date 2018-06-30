import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SpTreeviewNodeComponent } from './sp-treeview-node/sp-treeview-node.component';
import { MatProgressBarModule, MatCheckboxModule, MatRadioModule, MatButtonModule, MatIconModule, MatInputModule, MatFormFieldModule } from '@angular/material';
import { SpTreeviewComponent } from './sp-treeview/sp-treeview.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

@NgModule({
  imports: [
    CommonModule,
    MatProgressBarModule,
    MatCheckboxModule,
    MatRadioModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    BrowserAnimationsModule
  ],
  declarations: [SpTreeviewNodeComponent, SpTreeviewComponent],
  exports: [
    SpTreeviewComponent
  ]
})
export class SpTreeviewModule { }

import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SpTreeviewNodeComponent } from './sp-treeview-node/sp-treeview-node.component';
import {
  MatProgressBarModule, MatCheckboxModule, MatRadioModule, MatButtonModule, MatIconModule,
  MatInputModule, MatFormFieldModule, MatChipsModule
} from '@angular/material';
import { SpTreeviewComponent } from './sp-treeview/sp-treeview.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { SpTreeviewOverlayComponent } from './sp-treeview-overlay/sp-treeview-overlay.component';
import { SpTreeviewDropdownComponent } from './sp-treeview-dropdown/sp-treeview-dropdown.component';

@NgModule({
  imports: [
    CommonModule,
    BrowserAnimationsModule,
    MatProgressBarModule,
    MatCheckboxModule,
    MatRadioModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatChipsModule
  ],
  declarations: [SpTreeviewNodeComponent, SpTreeviewComponent, SpTreeviewOverlayComponent, SpTreeviewDropdownComponent],
  exports: [
    SpTreeviewComponent,
    SpTreeviewOverlayComponent,
    SpTreeviewDropdownComponent
  ]
})
export class SpTreeviewModule { }

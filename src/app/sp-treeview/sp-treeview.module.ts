import { NgModule } from '@angular/core';

import { SpTreeviewComponent } from './sp-treeview/sp-treeview.component';
import { SpTreeviewNodeComponent } from './sp-treeview-node/sp-treeview-node.component';
import { SpTreeviewDropdownComponent } from './sp-treeview-dropdown/sp-treeview-dropdown.component';
import { SpTreeviewOverlayComponent } from './sp-treeview-overlay/sp-treeview-overlay.component';

/**
 * NgModule compatibility shim.
 *
 * All components are now standalone. This module exists so that existing
 * consumers who import SpTreeviewModule do not need to change their code.
 * New consumers can import the standalone components directly:
 *
 *   imports: [SpTreeviewComponent, SpTreeviewDropdownComponent, SpTreeviewOverlayComponent]
 *
 * Note: BrowserAnimationsModule (or provideAnimations()) must be provided
 * by the consuming application — it is not included here.
 */
@NgModule({
  imports: [
    SpTreeviewNodeComponent,
    SpTreeviewComponent,
    SpTreeviewDropdownComponent,
    SpTreeviewOverlayComponent,
  ],
  exports: [
    SpTreeviewComponent,
    SpTreeviewDropdownComponent,
    SpTreeviewOverlayComponent,
  ],
})
export class SpTreeviewModule { }

import { Component, OnInit, Input } from '@angular/core';


import {TodoItem} from "./TodoItem";
import {TodoFilters} from "./TodoFilters";
import { Apollo } from 'apollo-angular';
import gql from 'graphql-tag';

const GET_MY_TODOS = gql`
 query getMyTodos {
   todos(where: { is_public: { _eq: false} }, order_by: { created_at: desc }) {
     id
     title
     created_at
     is_completed
 }
}`;

@Component({
    selector: 'TodoPrivateList',
    templateUrl: './TodoPrivateList.template.html',
  })

export class TodoPrivateList implements OnInit {

          filter = "all";
          clearInProgress= false;
          todos= [];
          filteredTodos: any;

          loading: boolean = true;
          constructor(private apollo: Apollo) {}
          ngOnInit() {
            this.apollo.watchQuery<any>({
              query: GET_MY_TODOS
            })
            .valueChanges
            .subscribe(({ data, loading }) => {
              this.loading = loading;
              this.todos = data.todos;
              this.filteredTodos = this.todos;
            });
          }


      filterResults($event) {
        this.filter = $event.filter;
        this.filteredTodos = this.todos;
        if (this.filter === "active") {
            this.filteredTodos = this.todos.filter(todo => todo.is_completed !== true);
          } else if (this.filter === "completed") {
            this.filteredTodos = this.todos.filter(todo => todo.is_completed === true);
          }
      }

      clearCompleted() {}
}

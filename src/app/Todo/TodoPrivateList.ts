import { Component, OnInit, Input } from '@angular/core';


import {TodoItem} from "./TodoItem";
import {TodoFilters} from "./TodoFilters";
import { Apollo } from 'apollo-angular';
import gql from 'graphql-tag';

// Run a subscription to get the latest public todo
const NOTIFY_NEW_PUBLIC_TODOS = gql`
 subscription notifyNewPublicTodos {
   todos (where: { is_public: { _eq: true}}, limit: 1, order_by: {created_at: desc }) {
     id
     created_at
   }
 }
`;

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

          oldestTodoId;
         newestTodoId;

          todos= [];

          filteredTodos: any;

          loading: boolean = true;
           constructor(private apollo: Apollo) {}
                ngOnInit() {
                  this.getNotifications();
                }
                getNotifications() {
                  this.apollo.subscribe({
                    query: NOTIFY_NEW_PUBLIC_TODOS,
                  }).subscribe(({ data, loading }) => {
                    this.loading = loading;
                    if(data) {
                      const latestTodo = data.todos.length ? data.todos[0] : null;
                      this.olderTodosAvailable = latestTodo? true: false;
                      this.oldestTodoId=latestTodo? (latestTodo.id +1) : 0 ;
                      if (latestTodo && latestTodo.id > this.newestTodoId) {
                        this.newestTodoId = latestTodo.id;
                        this.newTodosCount = this.newTodosCount +1;
                      } else {
                        this.newestTodoId=latestTodo? latestTodo.id : 0;
                        this.loadOlder();
                      }
                    }
                    console.log('got data', data);
                  },(error) => {
                    console.log('there was an error sending the query', error);
                  });
                }




          loadOlder() {
            const GET_OLD_PUBLIC_TODOS = gql`
            query getOldPublicTodos ($oldestTodoId: Int!) {
              todos (where: { is_public: { _eq: true}, id: {_lt: $oldestTodoId}}, limit: 7, order_by: { created_at: desc }) {
                id
                title
                created_at
                user {
                  name
                }
              }
            }`;
            this.apollo.watchQuery({
              query: GET_OLD_PUBLIC_TODOS,
              variables: {oldestTodoId: this.oldestTodoId}
            })
            .valueChanges
            .subscribe(({ data, loading }) => {
              const todosData : any = data;
              if(todosData) {
                if (todosData.todos.length) {
                  this.oldestTodoId = todosData.todos[todosData.todos.length - 1].id;
                  this.todos = [...this.todos, ...todosData.todos]
                } else {
                  this.olderTodosAvailable = false;
                }
              }
              console.log('got data', data);
            },(error) => {
              console.log('there was an error sending the query', error);
            });
          }

          loadNew() {
            const GET_NEW_PUBLIC_TODOS = gql`
            query getNewPublicTodos ($latestVisibleId: Int!) {
              todos(where: { is_public: { _eq: true}, id: {_gt: $latestVisibleId}}, order_by: { created_at: desc }) {
                id
                title
                created_at
                user {
                  name
                }
              }
            }
            `;
            this.apollo.watchQuery({
              query: GET_NEW_PUBLIC_TODOS,
              variables: {latestVisibleId: this.todos[0].id}
            })
            .valueChanges
            .subscribe(({ data, loading }) => {
              const todosData : any = data;
              if(todosData) {
                this.newestTodoId = todosData.todos[0].id;
                this.todos = [...todosData.todos, ...this.todos]
                this.newTodosCount=0;
              }
              console.log('got data', data);
            },(error) => {
              console.log('there was an error sending the query', error);
            });
          }

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

      clearCompleted() {
        // Remove all the todos that are completed
  const CLEAR_COMPLETED = gql`
    mutation clearCompleted {
      delete_todos(where: {is_completed: {_eq: true}, is_public: {_eq: false}}) {
        affected_rows
      }
    }
  `;
   this.apollo.mutate({
        mutation: CLEAR_COMPLETED,
        optimisticResponse: {},
        update: (cache, {data}) => {
            const existingTodos : any = cache.readQuery({ query: GET_MY_TODOS });
            const newTodos = existingTodos.todos.filter(t => (!t.is_completed));
            cache.writeQuery({query:GET_MY_TODOS, data: {todos: newTodos}});
        },
        }).subscribe(({ data, loading }) => {
          console.log('got data ', data);
        },(error) => {
          console.log('there was an error sending the query', error);
        });
      }
}
